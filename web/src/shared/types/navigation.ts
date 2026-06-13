export type NavigationItem = {
  label: string;
  href: string;
};

export type PortalLink = {
  title: string;
  description: string;
  href: string;
  tone: "primary" | "accent" | "warning" | "neutral";
};
