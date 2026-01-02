import { useOutletContext } from 'react-router-dom';
import FPADrivers from '../FPADrivers';

const FPADriversPage = () => {
  const { user } = useOutletContext();
  return <FPADrivers user={user} />;
};

export default FPADriversPage;
