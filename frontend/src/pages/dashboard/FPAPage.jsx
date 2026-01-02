import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const FPAPage = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to the new nested FP&A route
    navigate('/dashboard/fpa/overview', { replace: true });
  }, [navigate]);
  
  return null;
};

export default FPAPage;
