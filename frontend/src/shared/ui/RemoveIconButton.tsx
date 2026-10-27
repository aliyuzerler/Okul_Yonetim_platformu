import { Button } from "@carbon/react";
import { TrashCan } from "@carbon/icons-react";

interface Props {
  label?: string;
  onClick: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

// Ghost icon-only trash button, for the row-level remove action repeated across admin list pages.
export default function RemoveIconButton({ label = "Kaldır", onClick, disabled, size = "sm" }: Props) {
  return (
    <Button
      hasIconOnly
      kind="ghost"
      size={size}
      iconDescription={label}
      renderIcon={TrashCan}
      disabled={disabled}
      onClick={onClick}
    />
  );
}
