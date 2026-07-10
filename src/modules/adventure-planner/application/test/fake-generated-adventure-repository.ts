import type {
  ExistingGeneratedAdventureLookup,
  GeneratedAdventureRepository,
  PersistedGeneratedAdventure,
  SaveGeneratedAdventureInput,
  SaveGeneratedAdventureResult,
} from "../generate-adventure/ports";

type StoredAdventure = {
  adventureId: string;
  userId: string;
};

export class FakeGeneratedAdventureRepository implements GeneratedAdventureRepository {
  private readonly ownedAdventures = new Map<string, StoredAdventure>();
  private readonly generatedAdventures = new Map<string, PersistedGeneratedAdventure>();
  private nextGeneratedAdventureNumber = 1;

  seedAdventure(input: { adventureId: string; userId: string }): void {
    this.ownedAdventures.set(input.adventureId, {
      adventureId: input.adventureId,
      userId: input.userId,
    });
  }

  seedGeneratedAdventure(input: SaveGeneratedAdventureInput & { generatedAdventureId?: string }): PersistedGeneratedAdventure {
    this.ensureOwnedAdventure(input);

    const generatedAdventure: PersistedGeneratedAdventure = {
      adventureId: input.adventureId,
      generatedAdventureId:
        input.generatedAdventureId ?? `generated-adventure-${this.nextGeneratedAdventureNumber}`,
      adventure: input.adventure,
    };
    this.nextGeneratedAdventureNumber += 1;
    this.generatedAdventures.set(input.adventureId, generatedAdventure);

    return generatedAdventure;
  }

  async findExistingGeneratedAdventure(
    input: ExistingGeneratedAdventureLookup,
  ): Promise<PersistedGeneratedAdventure | null> {
    if (!this.isOwnedAdventure(input)) {
      return null;
    }

    return this.generatedAdventures.get(input.adventureId) ?? null;
  }

  async saveGeneratedAdventure(input: SaveGeneratedAdventureInput): Promise<SaveGeneratedAdventureResult> {
    this.ensureOwnedAdventure(input);

    const existing = this.generatedAdventures.get(input.adventureId);
    if (existing) {
      return { ...existing, reusedExistingAdventure: true };
    }

    const persisted = this.seedGeneratedAdventure(input);
    return { ...persisted, reusedExistingAdventure: false };
  }

  private isOwnedAdventure(input: ExistingGeneratedAdventureLookup): boolean {
    return this.ownedAdventures.get(input.adventureId)?.userId === input.userId;
  }

  private ensureOwnedAdventure(input: ExistingGeneratedAdventureLookup): void {
    if (!this.isOwnedAdventure(input)) {
      throw new Error("Adventure was not found.");
    }
  }
}
