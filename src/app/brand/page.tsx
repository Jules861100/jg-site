import { createClient } from "@/lib/supabase/server";

export default async function BrandSpace() {
  const supabase = await createClient();

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, launch_date, components(id, name, pantone)")
    .order("launch_date", { ascending: true });

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Espace marque
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Vos lancements et leurs composants, alimentés par les fiches
        fournisseur partagées.
      </p>

      {error && (
        <p className="mt-8 text-sm text-red-600">
          Connectez-vous pour voir vos projets ({error.message}).
        </p>
      )}

      <ul className="mt-8 flex flex-col gap-4">
        {projects?.map((project) => (
          <li
            key={project.id}
            className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <p className="font-medium text-zinc-950 dark:text-zinc-50">{project.name}</p>
            <p className="text-sm text-zinc-500">
              Lancement : {project.launch_date ?? "non défini"}
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              {project.components?.length ?? 0} composant(s)
            </p>
          </li>
        ))}
        {projects?.length === 0 && (
          <p className="text-sm text-zinc-500">Aucun projet pour le moment.</p>
        )}
      </ul>
    </div>
  );
}
