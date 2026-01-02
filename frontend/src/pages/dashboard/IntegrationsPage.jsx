import { useOutletContext } from 'react-router-dom';
import Integrations from '../Integrations';

const IntegrationsPage = () => {
  const { companies, selectedCompany } = useOutletContext();
  
  return <Integrations companies={companies} selectedCompany={selectedCompany} />;
};

export default IntegrationsPage;
