import { Link } from 'react-router-dom';
import type { ProjectStatus } from '@shared/models/project';

interface ProjectHeaderProps {
  name: string;
  status: ProjectStatus;
}

export function ProjectHeader({ name, status }: ProjectHeaderProps) {
  return (
    <header className="flex flex-col gap-2 border-b border-slate-100 pb-6 md:flex-row md:items-center md:justify-between">
      <div>
        <Link to="/projects" className="text-xs font-medium uppercase tracking-wide text-blue-600">
          &larr; Back to projects
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">{name}</h1>
      </div>
      <div className="rounded-full bg-blue-50 px-4 py-1 text-sm font-medium text-blue-700 capitalize">
        {status}
      </div>
    </header>
  );
}
