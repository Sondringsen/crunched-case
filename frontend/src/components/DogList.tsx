"use client";

import { useState } from "react";
import { Dog } from "@/types";
import DogForm from "./DogForm";

export default function DogList({ initialDogs }: { initialDogs: Dog[] }) {
  const [dogs, setDogs] = useState<Dog[]>(initialDogs);

  return (
    <div>
      <h2>Add a Dog</h2>
      <DogForm onCreated={(dog) => setDogs((prev) => [...prev, dog])} />

      <h2 style={{ marginTop: 32 }}>All Dogs</h2>
      {dogs.length === 0 ? (
        <p>No dogs yet.</p>
      ) : (
        <ul>
          {dogs.map((dog) => (
            <li key={dog.id}>
              <strong>{dog.name}</strong> — {dog.breed}
              {dog.age != null ? `, ${dog.age} yrs` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
