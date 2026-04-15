import { useState } from "react";
import { createListing } from "../api/listings";
import type { Listing } from "../types";

const categories = [
  { value: "tractor", label: "Tractor" },
  { value: "combine", label: "Combine" },
  { value: "implement", label: "Implement" },
  { value: "attachment", label: "Attachment" },
] as const;

interface Props {
  onSuccess: (listing: Listing) => void;
}

export default function CreateListingForm({ onSuccess }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const data = new FormData(e.currentTarget);
    const title = (data.get("title") as string).trim();
    const description = (data.get("description") as string).trim();
    const category = (data.get("category") as string).trim();
    const startingPrice = parseFloat(data.get("startingPrice") as string);
    const endsAtRaw = (data.get("endsAt") as string).trim();
    const endsAt = new Date(endsAtRaw);

    if (!title) {
      setError("Title is required.");
      return;
    }
    if (!description) {
      setError("Description is required.");
      return;
    }
    if (!categories.some((option) => option.value === category)) {
      setError("Category is required.");
      return;
    }
    if (isNaN(startingPrice) || startingPrice < 0) {
      setError("Starting price must be a positive number.");
      return;
    }
    if (!endsAtRaw || isNaN(endsAt.getTime())) {
      setError("Auction end date is required.");
      return;
    }
    if (endsAt.getTime() <= Date.now()) {
      setError("Auction end date must be in the future.");
      return;
    }

    setSubmitting(true);
    try {
      const listing = await createListing({
        title,
        description,
        category: category as Listing["category"],
        startingPrice,
        endsAt: endsAt.toISOString(),
      });
      onSuccess(listing);
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="bid-form" onSubmit={handleSubmit}>
      <h4 className="bid-form__title">New Listing</h4>
      {error && <div className="bid-form__error">{error}</div>}
      <div className="bid-form__field">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          type="text"
          placeholder="e.g. 2018 John Deere 6120M"
          disabled={submitting}
        />
      </div>
      <div className="bid-form__field">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          placeholder="Describe the equipment, condition, and features"
          disabled={submitting}
        />
      </div>
      <div className="bid-form__field">
        <label htmlFor="category">Category</label>
        <select id="category" name="category" disabled={submitting}>
          <option value="">Select category</option>
          {categories.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="bid-form__field">
        <label htmlFor="startingPrice">Starting Price ($)</label>
        <input
          id="startingPrice"
          name="startingPrice"
          type="number"
          min={0}
          step={1}
          placeholder="e.g. 25000"
          disabled={submitting}
        />
      </div>
      <div className="bid-form__field">
        <label htmlFor="endsAt">Auction End Date</label>
        <input
          id="endsAt"
          name="endsAt"
          type="datetime-local"
          disabled={submitting}
        />
      </div>
      <button type="submit" className="bid-form__submit" disabled={submitting}>
        {submitting ? "Creating…" : "Create Listing"}
      </button>
    </form>
  );
}
