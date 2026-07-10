import type { ValidatedGeneratedAdventureContent } from "../generate-adventure/output";
import type {
  AdventureGenerator,
  AdventureGeneratorRequest,
} from "../generate-adventure/ports";
import { buildGeneratedAdventureBoundaryPayload } from "./generated-adventure-fixtures";
import { parseGeneratedAdventure } from "../../domain/generated-adventure";

export class FakeAdventureGenerator implements AdventureGenerator {
  readonly requests: AdventureGeneratorRequest[] = [];

  private queuedResults: Array<ValidatedGeneratedAdventureContent | Error> = [];

  queueAdventure(adventure: ValidatedGeneratedAdventureContent): void {
    this.queuedResults.push(adventure);
  }

  queueError(error: Error): void {
    this.queuedResults.push(error);
  }

  async generateAdventure(
    input: AdventureGeneratorRequest,
  ): Promise<ValidatedGeneratedAdventureContent> {
    this.requests.push(input);
    const result = this.queuedResults.shift() ?? validGeneratedAdventure();

    if (result instanceof Error) {
      throw result;
    }

    return result;
  }
}

export function validGeneratedAdventure(): ValidatedGeneratedAdventureContent {
  return parseGeneratedAdventure(buildGeneratedAdventureBoundaryPayload());
}
