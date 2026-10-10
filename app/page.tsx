const features = [
  {
    title: "Create customers",
    description:
      "Keep every customer's contact details, addresses and notes in one place.",
  },
  {
    title: "Assign services",
    description:
      "Schedule jobs and assign the right service to the right customer and team.",
  },
  {
    title: "Manage invoices",
    description:
      "Bill completed work and keep track of what has been paid and what is due.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center sm:py-32">
        <p className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
          Fieldwork Service Operations
        </p>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
          Run your field services from one place
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
          Create customers, assign services and manage invoices without the
          paperwork.
        </p>
        <a
          href="/customers"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Explore
        </a>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-3">
        {features.map((feature, index) => (
          <div key={feature.title} className="rounded-lg border p-6">
            <span className="text-sm font-medium text-muted-foreground">
              0{index + 1}
            </span>
            <h2 className="mt-2 text-lg font-semibold">{feature.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {feature.description}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
