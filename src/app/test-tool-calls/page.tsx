import TestToolCallsUI from '@/components/test/TestToolCallsUI';
import SimpleToolCallTest from '@/components/test/SimpleToolCallTest';

export default function TestToolCallsPage() {
  return (
    <div>
      <SimpleToolCallTest />
      <hr style={{ margin: '40px 0', border: '1px solid #eee' }} />
      <TestToolCallsUI />
    </div>
  );
} 