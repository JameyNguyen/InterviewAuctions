export interface Bid {
	bidderName: string;
	amount: number;
	placedAt: string;
}

export interface Listing {
	id: string;
	title: string;
	description: string;
	category: "tractor" | "combine" | "implement" | "attachment";
	startingPrice: number;
	currentBid: number;
	currentBidder: string | null;
	status: "active" | "closed" | "pending";
	endsAt: string;
	imageUrl: string;
	bids: Bid[];
}
