import { ModulePage } from "@/components/layout/module-page";

export default function MedicinesPage() {
  return (
    <ModulePage
      eyebrow="Catalog"
      title="Medicine search"
      description="Search route for brand, generic, salt, strength, prescription requirement, restrictions, storage, and substitution signals."
      sections={[
        {
          title: "Search API",
          body: "Backed by the catalog service through the gateway /medicines prefix.",
          status: "/medicines",
        },
        {
          title: "Safety labels",
          body: "Surface prescription-required, restricted, duplicate salt, and cold-chain warnings before cart add.",
          status: "Safety",
        },
      ]}
    />
  );
}
