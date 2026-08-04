import type { GetAdventureDetailMenuInput } from "./input";
import { mapAdventureDetailMenuView } from "./menu-view-mapper";
import type { GetAdventureDetailMenuResult } from "./output";
import type { AdventureDetailContentReader } from "./ports";

export type GetAdventureDetailMenuDependencies = {
  contentReader: AdventureDetailContentReader;
};

export async function getAdventureDetailMenu(
  input: GetAdventureDetailMenuInput,
  dependencies: GetAdventureDetailMenuDependencies,
): Promise<GetAdventureDetailMenuResult> {
  const result = await dependencies.contentReader.findGeneratedAdventureForDisplay(input);

  if (result.status === "not_found" || result.status === "not_ready") {
    return result;
  }

  return {
    status: "found",
    menu: mapAdventureDetailMenuView(result.content),
  };
}
