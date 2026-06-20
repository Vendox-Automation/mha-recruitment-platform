"use client";

import { useTranslations } from "next-intl";
import {
  useFieldArray,
  useFormContext,
  useWatch,
  type Control,
} from "react-hook-form";

import { Button, Checkbox, Field, Input, Select } from "@/components/ui";

import {
  SCREENING_QUESTION_TYPES,
  type JobFormValues,
} from "../employerSchema";

/**
 * Screening-questions editor (spec §14.11). Lives inside the {@link JobForm}'s
 * react-hook-form context and edits the `screening_questions` field array:
 * add / remove / reorder questions, choose a type, mark required, and — only
 * for SINGLE_CHOICE — manage the answer options list. Options are hidden (and
 * ignored on submit) for every other type, matching the server contract.
 *
 * Reordering uses explicit move-up / move-down buttons rather than drag so it
 * is fully keyboard-operable on these calm working screens (spec §11.7, §23).
 */
export function ScreeningQuestionsEditor({ disabled }: { disabled?: boolean }) {
  const t = useTranslations("employer.screening");
  const { control } = useFormContext<JobFormValues>();

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "screening_questions",
  });

  return (
    <fieldset className="flex flex-col gap-4 border-0 p-0">
      <div className="flex flex-col gap-1">
        <legend className="type-label text-text-primary">{t("title")}</legend>
        <p className="type-caption">{t("hint")}</p>
      </div>

      {fields.length === 0 ? (
        <p className="type-body-sm text-text-secondary">{t("empty")}</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {fields.map((field, index) => (
            <QuestionRow
              key={field.id}
              fieldId={field.id}
              index={index}
              isFirst={index === 0}
              isLast={index === fields.length - 1}
              disabled={disabled}
              onMoveUp={() => move(index, index - 1)}
              onMoveDown={() => move(index, index + 1)}
              onRemove={() => remove(index)}
            />
          ))}
        </ol>
      )}

      <div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() =>
            append({
              question: "",
              question_type: "SHORT_TEXT",
              is_required: false,
              options: [],
            })
          }
        >
          {t("addQuestion")}
        </Button>
      </div>
    </fieldset>
  );
}

interface QuestionRowProps {
  fieldId: string;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  disabled?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

/** A single screening question; options appear only for SINGLE_CHOICE. */
function QuestionRow({
  fieldId,
  index,
  isFirst,
  isLast,
  disabled,
  onMoveUp,
  onMoveDown,
  onRemove,
}: QuestionRowProps) {
  const t = useTranslations("employer.screening");
  const tType = useTranslations("employer.screening.types");
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<JobFormValues>();

  const type = useWatch({
    control,
    name: `screening_questions.${index}.question_type`,
  });
  const fieldError = errors.screening_questions?.[index];

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border-default bg-surface-subtle p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="type-label text-text-secondary">
          {t("questionLabel", { number: index + 1 })}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || isFirst}
            onClick={onMoveUp}
            aria-label={t("moveUp", { number: index + 1 })}
          >
            ↑
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || isLast}
            onClick={onMoveDown}
            aria-label={t("moveDown", { number: index + 1 })}
          >
            ↓
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={onRemove}
            aria-label={t("remove", { number: index + 1 })}
          >
            {t("removeLabel")}
          </Button>
        </div>
      </div>

      <Field
        label={t("questionText")}
        required
        error={fieldError?.question?.message}
      >
        <Input
          disabled={disabled}
          {...register(`screening_questions.${index}.question`)}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("questionType")}>
          <Select
            disabled={disabled}
            {...register(`screening_questions.${index}.question_type`)}
          >
            {SCREENING_QUESTION_TYPES.map((value) => (
              <option key={value} value={value}>
                {tType(value)}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end">
          <Checkbox
            id={`${fieldId}-required`}
            label={t("required")}
            disabled={disabled}
            {...register(`screening_questions.${index}.is_required`)}
          />
        </div>
      </div>

      {type === "SINGLE_CHOICE" ? (
        <OptionsEditor index={index} control={control} disabled={disabled} />
      ) : null}
    </li>
  );
}

/** Editable answer-option list for a single SINGLE_CHOICE question. */
function OptionsEditor({
  index,
  control,
  disabled,
}: {
  index: number;
  control: Control<JobFormValues>;
  disabled?: boolean;
}) {
  const t = useTranslations("employer.screening");
  const {
    register,
    formState: { errors },
  } = useFormContext<JobFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: `screening_questions.${index}.options`,
  });

  // The "need ≥2 options" error is attached to the `options` array path.
  const optionsError = errors.screening_questions?.[index]?.options as
    | { message?: string }
    | undefined;

  return (
    <div className="flex flex-col gap-2">
      <span className="type-label text-text-secondary">{t("options")}</span>
      {fields.map((field, optionIndex) => (
        <div key={field.id} className="flex items-center gap-2">
          <Input
            disabled={disabled}
            aria-label={t("optionLabel", { number: optionIndex + 1 })}
            {...register(
              `screening_questions.${index}.options.${optionIndex}.value`,
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => remove(optionIndex)}
            aria-label={t("removeOption", { number: optionIndex + 1 })}
          >
            {t("removeLabel")}
          </Button>
        </div>
      ))}
      {optionsError?.message ? (
        <p role="alert" className="type-body-sm text-status-danger">
          {optionsError.message}
        </p>
      ) : null}
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => append({ value: "" })}
        >
          {t("addOption")}
        </Button>
      </div>
    </div>
  );
}
