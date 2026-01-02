const AIAdvisorPage = () => {
  return (
    <div style={{ height: 'calc(100vh - 400px)', overflow: 'hidden' }}>
      <iframe 
        src="/ai-advisor" 
        style={{ 
          width: '100%', 
          height: '100%', 
          border: 'none',
          borderRadius: '12px'
        }}
        title="AI Financial Advisor"
      />
    </div>
  );
};

export default AIAdvisorPage;
