import { SlotMachine } from "@/components/SlotMachine";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-purple-950/20 text-zinc-100 flex flex-col items-center px-4 py-10">
      <SlotMachine />
    </main>
  );
}
