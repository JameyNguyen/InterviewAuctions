import json
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

# ============================================================
# Models
# ============================================================

#Made by Jamey; its a Bid designed for keeping history of bids.
class Bid(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )
    
    bidderName: str
    amount: float
    placedAt: str

class Listing(BaseModel):
    """Wire JSON matches the TypeScript server (camelCase keys)."""

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

    id: str
    title: str
    description: str
    category: Literal["tractor", "combine", "implement", "attachment"]
    starting_price: float
    current_bid: float
    current_bidder: Optional[str]
    status: Literal["active", "closed", "pending"]
    ends_at: str
    image_url: str
    bids: list[Bid] = []


class BidRequest(BaseModel):
    bidder: str
    amount: float


class CreateListingRequest(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )
    
    title: str
    description: str
    category: Literal["tractor", "combine", "implement", "attachment"]
    starting_price: float
    ends_at: str


# ============================================================
# In-memory store — seeded from data/listings.json
# ============================================================

_data_file = Path(__file__).parent / "data" / "listings.json"
listings: list[Listing] = [
    Listing(**item) for item in json.loads(_data_file.read_text())
]

# Created by Jamey
# Helper function to save the created listings to the JSON file.
# It should get called at the creation of every new listing, or update the existing listing when a new bid is placed.
def save_listings():
    data = [item.model_dump(by_alias=True) for item in listings]
    _data_file.write_text(json.dumps(data, indent="\t"))

# ============================================================
# App
# ============================================================

app = FastAPI(title="Interview Auctions")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(
    "/api/listings",
    response_model=list[Listing],
    response_model_by_alias=True,
)
def get_listings(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
):
    filtered = listings
    
    # Filter by category if provided
    if category:
        category = category.lower()
        if category in ["tractor", "combine", "implement", "attachment"]:
            filtered = [l for l in filtered if l.category == category]
    
    # Filter by search text (title or description)
    if search:
        search_lower = search.lower()
        filtered = [
            l for l in filtered
            if search_lower in l.title.lower() or search_lower in l.description.lower()
        ]
    
    return filtered


@app.post(
    "/api/listings",
    response_model=Listing,
    status_code=201,
    response_model_by_alias=True,
)
def create_listing(body: CreateListingRequest):
    if not body.title or not body.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")
    if not body.description or not body.description.strip():
        raise HTTPException(status_code=400, detail="Description is required")
    if body.starting_price < 0:
        raise HTTPException(status_code=400, detail="Starting price must be a positive number")

    try:
        ends_at = datetime.fromisoformat(body.ends_at.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Auction end date must be a valid ISO date")

    if ends_at.tzinfo is None:
        ends_at = ends_at.replace(tzinfo=timezone.utc)

    if ends_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Auction end date must be in the future")

    listing = Listing(
        id=str(uuid.uuid4()),
        title=body.title.strip(),
        description=body.description.strip(),
        category=body.category,
        starting_price=body.starting_price,
        current_bid=body.starting_price,
        current_bidder=None,
        status="active",
        ends_at=ends_at.astimezone(timezone.utc).isoformat(),
        image_url="",
        bids=[],
    )
    listings.append(listing)
    save_listings()
    return listing


@app.get(
    "/api/listings/{listing_id}",
    response_model=Listing,
    response_model_by_alias=True,
)
def get_listing(listing_id: str):
    listing = next((l for l in listings if l.id == listing_id), None)
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing


@app.post(
    "/api/listings/{listing_id}/bids",
    response_model=Listing,
    status_code=201,
    response_model_by_alias=True,
)
def place_bid(listing_id: str, bid: BidRequest):
    listing = next((l for l in listings if l.id == listing_id), None)
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.status != "active":
        raise HTTPException(
            status_code=400, detail="This listing is not currently active"
        )

    ends_at = datetime.fromisoformat(listing.ends_at.replace("Z", "+00:00"))
    if ends_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=400,
            detail="This auction has already ended and can no longer accept bids.",
        )

    if not bid.bidder or not bid.bidder.strip():
        raise HTTPException(status_code=400, detail="Bidder name is required")

    # This should also just be strictly greater than because then the bid could become free, which doesn't make sense
    # if there's a starting price as well.
    if bid.amount < 0:
        raise HTTPException(
            status_code=400, detail="Bid amount must be a positive number"
        )

    # I changed this to strictly greater than, because a bid that matches the current bid should not override the original bid.
    if bid.amount < listing.current_bid:
        raise HTTPException(
            status_code=400,
            detail=f"Bid must be greater than the current bid of ${listing.current_bid:,.0f}",
        )

    listing.current_bid = bid.amount
    listing.bids.append(Bid(
        bidderName=bid.bidder.strip(),
        amount=bid.amount,
        placedAt=datetime.now(timezone.utc).isoformat(),
    ))
    save_listings()
    listing.current_bidder = bid.bidder.strip()

    return listing
