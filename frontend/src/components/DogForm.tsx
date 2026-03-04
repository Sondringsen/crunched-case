"use client";

import { useState } from "react";
import { api } from "@/services/api";
import { Dog } from "@/types";

export default function DogForm({ onCreated }: { onCreated: (dog: Dog) => void }) {
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const dog = await api.post<Dog>("/dogs", {
        name,
        breed,
        age: age ? parseInt(age) : null,
      });
      onCreated(dog);
      setName("");
      setBreed("");
      setAge("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 }}>
      <input
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        placeholder="Breed"
        value={breed}
        onChange={(e) => setBreed(e.target.value)}
        required
      />
      <input
        placeholder="Age (optional)"
        type="number"
        value={age}
        onChange={(e) => setAge(e.target.value)}
      />
      <button type="submit" disabled={loading}>
        {loading ? "Creating…" : "Add Dog"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
}
