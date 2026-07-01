import type { ReactNode } from 'react';
interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function SectionHeader({ title, description, actions }: SectionHeaderProps) {
  return (
    <header className="page-header" aria-label={title}>
      <div>
        <div className="page-breadcrumb">
          <span>Dashboard</span>
          <span>/</span>
          <strong>{title}</strong>
        </div>
        <h1 className="page-header__title">{title}</h1>
        {description ? <div className="page-header__description">{description}</div> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}
