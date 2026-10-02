declare module 'lucide-react' {
  import type { ReactElement, SVGProps } from 'react';
  export type IconProps = SVGProps<SVGSVGElement> & { size?: number | string };
  export const ArrowDownUp: (props: IconProps) => ReactElement | null;
  export const Check: (props: IconProps) => ReactElement | null;
  export const ChevronRight: (props: IconProps) => ReactElement | null;
  export const CircleAlert: (props: IconProps) => ReactElement | null;
  export const Clock3: (props: IconProps) => ReactElement | null;
  export const Leaf: (props: IconProps) => ReactElement | null;
  export const Search: (props: IconProps) => ReactElement | null;
  export const ShieldCheck: (props: IconProps) => ReactElement | null;
  export const X: (props: IconProps) => ReactElement | null;
}
