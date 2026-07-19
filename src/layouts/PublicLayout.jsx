import { Outlet } from 'react-router-dom';

const PublicLayout = () => {
  return (
    <>
      <main className="bg-white min-h-screen ">
        <Outlet />
      </main>
    </>
  );
};

export default PublicLayout;