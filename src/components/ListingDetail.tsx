import { useState } from "react";
import BidForm from "./BidForm";
import type { Listing } from "../types";

interface Props {
  listing: Listing;
  onBidSuccess: (updated: Listing) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function redactName(name: string): string {
  if (!name || name.length <= 1) return name;
  return name[0] + "*".repeat(Math.min(name.length - 1, 3));
}

export default function ListingDetail({ listing, onBidSuccess }: Props) {
  const [showBidsCount, setShowBidsCount] = useState(2);

  const sortedBids = [...listing.bids].reverse();
  const displayedBids = sortedBids.slice(0, showBidsCount);
  const hasMoreBids = sortedBids.length > showBidsCount;
  const hasEnded =
    listing.status === "closed" ||
    new Date(listing.endsAt).getTime() <= Date.now();

  return (
    <div className="listing-detail">
      {listing.imageUrl && (
        <img
          src={listing.imageUrl}
          alt={listing.title}
          className="listing-detail__image"
        />
      )}
      <div className="listing-detail__header">
        <span className={`badge badge--${listing.category}`}>
          {listing.category}
        </span>
        <span className={`status-badge status-badge--${listing.status}`}>
          {listing.status}
        </span>
      </div>
      <h2 className="listing-detail__title">{listing.title}</h2>
      <p className="listing-detail__description">{listing.description}</p>

      <div className="listing-detail__meta">
        <div className="meta-row">
          <span className="meta-label">Starting Price</span>
          <span className="meta-value">
            ${listing.startingPrice.toLocaleString()}
          </span>
        </div>
        <div className="meta-row">
          <span className="meta-label">Current Bid</span>
          <span className="meta-value meta-value--highlight">
            ${listing.currentBid.toLocaleString()}
          </span>
        </div>
        <div className="meta-row">
          <span className="meta-label">Current Bidder</span>
          <span className="meta-value">
            {listing.currentBidder ?? "No bids yet"}
          </span>
        </div>
        <div className="meta-row">
          <span className="meta-label">Auction Ends</span>
          <span className="meta-value">{formatDate(listing.endsAt)}</span>
        </div>
      </div>

      {!hasEnded && listing.status === "active" ? (
        <BidForm listing={listing} onBidSuccess={onBidSuccess} />
      ) : (
        <div className="state-message">Bidding is closed for this auction.</div>
      )}

      <section className="listing-detail__history">
        <h3 className="listing-detail__section-title">Bid History</h3>
        {listing.bids.length === 0 ? (
          <div className="state-message">No bids yet.</div>
        ) : (
          <>
            <ul className="bid-history">
              {displayedBids.map((bid, index) => (
                <li
                  key={`${bid.bidderName}-${bid.amount}-${bid.placedAt}-${index}`}
                  className="bid-history__item"
                >
                  <div className="bid-history__content">
                    <span className="bid-history__bidder">
                      {redactName(bid.bidderName)}
                    </span>
                    <span className="bid-history__separator">•</span>
                    <span className="bid-history__amount">
                      ${bid.amount.toLocaleString()}
                    </span>
                    <span className="bid-history__separator">•</span>
                    <span className="bid-history__time">
                      {formatDate(bid.placedAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            {hasMoreBids && (
              <button
                className="bid-history__load-more"
                onClick={() => setShowBidsCount(showBidsCount + 5)}
              >
                Load More Bids ({displayedBids.length} of {sortedBids.length})
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
