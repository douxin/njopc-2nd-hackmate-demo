import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn, initials } from "@/lib/utils";

const avatarStyles = [
  "bg-[#EEF0FF] text-[#4F46E5]",
  "bg-[#EAF4EE] text-[#237A4B]",
  "bg-[#F4EFE7] text-[#8A6437]",
  "bg-[#F2EDF5] text-[#755287]",
  "bg-[#EAF2F5] text-[#326A7A]",
  "bg-[#F5EDEA] text-[#92543F]",
];

interface AvatarProps {
  name: string;
  avatarKey?: number;
  className?: string;
  textClassName?: string;
}

export function Avatar({ name, avatarKey = 0, className, textClassName }: AvatarProps) {
  const style = avatarStyles[Math.abs(avatarKey) % avatarStyles.length];
  return (
    <AvatarPrimitive.Root
      className={cn(
        "relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-black/[0.04]",
        className,
      )}
    >
      <AvatarPrimitive.Fallback
        className={cn(
          "flex h-full w-full items-center justify-center rounded-full text-[12px] font-semibold",
          style,
          textClassName,
        )}
      >
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
