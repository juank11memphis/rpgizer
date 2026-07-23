import type { EvalMatrixLlmConfiguration } from "./eval-matrix-types";

type EvalLlmConfigurationSectionProps = {
  configuration: EvalMatrixLlmConfiguration;
  selectedModel: string;
  disabled: boolean;
  onSelectedModelChange: (model: string) => void;
};

export function EvalLlmConfigurationSection({
  configuration,
  selectedModel,
  disabled,
  onSelectedModelChange,
}: EvalLlmConfigurationSectionProps) {
  return (
    <section aria-labelledby="eval-llm-configuration-heading" className="py-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h3 id="eval-llm-configuration-heading" className="text-sm font-semibold text-slate-100">
            LLM Configuration
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Uses this model for every test case in this suite run.
          </p>
        </div>
        <label className="flex min-w-0 flex-col gap-1 text-sm font-medium text-slate-200 md:w-80">
          Variant
          <select
            className="w-full border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            value={selectedModel}
            disabled={disabled}
            onChange={(event) => onSelectedModelChange(event.target.value)}
          >
            {configuration.modelGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
