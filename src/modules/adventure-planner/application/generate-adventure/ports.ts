import type { GeneratedAdventure } from "../../domain/generated-adventure";
import type { InterviewOutputArtifact } from "../../../game-master-assistant/domain/interview-output-artifact";
import type { InterviewMessage } from "../../../game-master-assistant/domain/interview-message";
import type { GeneratedAdventureContent } from "../../domain/generated-adventure-content";
import type { GeneratedAdventureDependencyLinks } from "../../domain/generated-adventure-dependencies";
import type { GeneratedAdventureXpBalance } from "../../domain/generated-adventure-xp";

export type ExistingGeneratedAdventureLookup = {
  userId: string;
  adventureId: string;
};

export type SaveGeneratedAdventureInput = ExistingGeneratedAdventureLookup & {
  interviewOutputArtifactId: string;
  adventure: GeneratedAdventure;
};

export type PersistedGeneratedAdventure = {
  adventureId: string;
  generatedAdventureId: string;
  adventure: GeneratedAdventure;
};

export type SaveGeneratedAdventureResult = PersistedGeneratedAdventure & {
  reusedExistingAdventure: boolean;
};

export type GeneratedAdventureRepository = {
  findExistingGeneratedAdventure(
    input: ExistingGeneratedAdventureLookup,
  ): Promise<PersistedGeneratedAdventure | null>;
  saveGeneratedAdventure(input: SaveGeneratedAdventureInput): Promise<SaveGeneratedAdventureResult>;
};

export type AdventureGeneratorRequest = ExistingGeneratedAdventureLookup & {
  goalText: string;
  interviewOutputArtifactId: string;
  interviewOutputArtifact: InterviewOutputArtifact;
  transcript: InterviewMessage[];
};

export type AdventureContentGenerator = {
  generateAdventureContent(input: AdventureGeneratorRequest): Promise<GeneratedAdventureContent>;
};

export type AdventureDependencyLinker = {
  linkAdventureDependencies(
    content: GeneratedAdventureContent,
    context?: { userId?: string; adventureId?: string },
  ): Promise<GeneratedAdventureDependencyLinks>;
};

export type AdventureXpBalancer = {
  balanceAdventureXp(
    content: GeneratedAdventureContent,
    dependencies: GeneratedAdventureDependencyLinks,
    context?: { userId?: string; adventureId?: string },
  ): Promise<GeneratedAdventureXpBalance>;
};


export const ADVENTURE_GENERATOR_ERROR_CODES = [
  "configuration_missing",
  "provider_request_failed",
  "provider_output_invalid",
] as const;

export type AdventureGeneratorErrorCode = (typeof ADVENTURE_GENERATOR_ERROR_CODES)[number];

export const ADVENTURE_GENERATOR_FAILURE_USER_MESSAGE =
  "Couldn’t generate the Adventure yet. Keep this page open and retry.";

export class AdventureGeneratorError extends Error {
  constructor(
    readonly code: AdventureGeneratorErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "AdventureGeneratorError";
  }
}

export class AdventureGeneratorFailure extends Error {
  constructor(
    readonly code: AdventureGeneratorErrorCode,
    readonly userMessage = ADVENTURE_GENERATOR_FAILURE_USER_MESSAGE,
    options?: { cause?: unknown },
  ) {
    super(userMessage, options);
    this.name = "AdventureGeneratorFailure";
  }
}

export function normalizeAdventureGeneratorFailure(error: unknown): unknown {
  if (error instanceof AdventureGeneratorError) {
    return new AdventureGeneratorFailure(error.code, undefined, { cause: error });
  }

  return error;
}
