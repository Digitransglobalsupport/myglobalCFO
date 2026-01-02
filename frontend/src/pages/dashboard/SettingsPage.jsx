import { useOutletContext } from 'react-router-dom';
import Settings from '../Settings';

const SettingsPage = () => {
  const {
    handlePreferencesUpdate,
    companies,
    handleDeleteEntity,
    showAddCompany,
    setShowAddCompany,
    newCompany,
    setNewCompany,
    handleAddCompany
  } = useOutletContext();
  
  return (
    <Settings 
      onPreferencesUpdate={handlePreferencesUpdate}
      companies={companies}
      onDeleteEntity={handleDeleteEntity}
      showAddCompany={showAddCompany}
      setShowAddCompany={setShowAddCompany}
      newCompany={newCompany}
      setNewCompany={setNewCompany}
      handleAddCompany={handleAddCompany}
    />
  );
};

export default SettingsPage;
