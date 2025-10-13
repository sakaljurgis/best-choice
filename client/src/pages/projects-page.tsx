import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useCreateProjectMutation,
  useProjectsQuery
} from '../query/projects';

function ProjectsPage() {
  const { data, isLoading, isError, error } = useProjectsQuery();
  const createProjectMutation = useCreateProjectMutation();

  const navigate = useNavigate();
  const [newProjectName, setNewProjectName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const projects = data?.data ?? [];

  const listError = isError ? (error as Error).message : null;

  const projectCountLabel = useMemo(() => {
    if (isLoading) {
      return 'Loading projects…';
    }
    if (!projects.length) {
      return 'No projects yet – use the button below to create your first project.';
    }
    return `${projects.length} project${projects.length === 1 ? '' : 's'} found.`;
  }, [isLoading, projects.length]);

  const handleCreateProjectSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = newProjectName.trim();

    if (!trimmedName) {
      setCreateError('Project name is required.');
      return;
    }

    setCreateError(null);

    try {
      const project = await createProjectMutation.mutateAsync({
        name: trimmedName
      });
      setNewProjectName('');
      navigate(`/projects/${project.id}`);
    } catch (submitError) {
      setCreateError((submitError as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-4">
          <h1 className="text-xl font-semibold text-slate-900">Create a new project</h1>
          <p className="text-sm text-slate-500">
            Enter a project name to start comparing items instantly.
          </p>
        </header>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4"
          onSubmit={handleCreateProjectSubmit}
        >
          <label className="flex w-full flex-col gap-1 sm:flex-1 sm:max-w-xl" htmlFor="new-project-name">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Project Name
            </span>
            <input
              id="new-project-name"
              type="text"
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              placeholder="Home Office Upgrade"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              disabled={createProjectMutation.isPending}
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400 sm:flex-none"
            disabled={createProjectMutation.isPending}
          >
            {createProjectMutation.isPending ? 'Creating…' : 'Add Project'}
          </button>
        </form>
        {createError ? (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{createError}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Projects</h2>
            <p className="text-sm text-slate-500">{projectCountLabel}</p>
          </div>
        </header>

        {listError ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{listError}</p>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-slate-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-slate-500">
                  Attributes
                </th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-slate-500">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/projects/${project.id}`}
                      className="font-medium text-blue-600 hover:text-blue-700"
                    >
                      {project.name}
                    </Link>
                    {project.description ? (
                      <p className="text-xs text-slate-500">{project.description}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 capitalize">{project.status}</td>
                  <td className="px-4 py-3">
                    {project.attributes.length
                      ? project.attributes.join(', ')
                      : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(project.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default ProjectsPage;
