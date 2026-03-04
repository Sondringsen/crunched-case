import { api } from "@/services/api";
import { Dog } from "@/types";
import DogList from "@/components/DogList";

export default async function DogsPage() {
  const dogs = await api.get<Dog[]>("/dogs");
  return (
    <main style={{ padding: 32 }}>
      <h1>Dogs</h1>
      <DogList initialDogs={dogs} />
    </main>
  );
}
