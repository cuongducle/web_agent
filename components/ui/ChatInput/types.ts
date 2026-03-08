/* eslint-disable no-unused-vars */
export interface ChatInputProps {
  value: string;
  onChange: (nextValue: string) => void;
  onSubmit: (event: React.FormEvent, textValue: string, files: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
  isLoading?: boolean;
  onStop?: () => void;
  ref?: React.Ref<HTMLTextAreaElement>;
}

export interface SendButtonProps {
  disabled: boolean;
  isLoading: boolean | undefined;
  onStop?: () => void;
}

export interface SettingsButtonProps {
  className?: string;
}
