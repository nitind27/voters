import Link from 'next/link';
import React from 'react';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  title: string;
  breadcrumbs: BreadcrumbItem[];
}

const Dashboardbread: React.FC<BreadcrumbsProps> = ({ title, breadcrumbs }) => {
  return (
    <div className=" bg-[#EA7929] rounded-lg w-full mx-auto border">
      <div className="flex items-center mt-1">
        <img
          width={80}
          height={80}
          src="./images/login/img.jpeg"
          alt="Logo"
          className="object-contain"
        />
        <h1 className="flex-1 text-3xl font-bold text-white text-center ml-4">
          {title}: 560
        </h1>
      </div>
      <nav className="flex space-x-2 text-gray-600 mt-2">
        {breadcrumbs.map((item, index) => (
          <React.Fragment key={index}>
            <Link
              href={item.href}
              className={`hover:text-blue-500 transition-colors ${
                index === breadcrumbs.length - 1
                  ? 'text-blue-500 font-medium'
                  : ''
              }`}
            >
              {item.label}
            </Link>
            {index < breadcrumbs.length - 1 && <span className="text-gray-400">/</span>}
          </React.Fragment>
        ))}
      </nav>
    </div>
  );
};

export default Dashboardbread;
