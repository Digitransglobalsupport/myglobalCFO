import { useOutletContext } from 'react-router-dom';
import FPAIntegrations from '../FPAIntegrations';

const FPAIntegrationsPage = () => {
  const { user } = useOutletContext();
  return <FPAIntegrations user={user} />;
};

export default FPAIntegrationsPage;
