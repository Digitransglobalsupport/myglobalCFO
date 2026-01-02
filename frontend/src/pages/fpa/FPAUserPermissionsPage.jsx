import { useOutletContext } from 'react-router-dom';
import FPAAdmin from '../FPAAdmin';

const FPAUserPermissionsPage = () => {
  const { user } = useOutletContext();
  return <FPAAdmin user={user} />;
};

export default FPAUserPermissionsPage;
