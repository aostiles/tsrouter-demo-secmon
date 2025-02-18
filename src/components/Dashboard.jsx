import Messages, { violationsStore, messagesStore } from './Messages';
import { useStore } from "@tanstack/react-store";

function Dashboard() {
  const violations = useStore(violationsStore);
  const messages = useStore(messagesStore);

  // Calculate violation statistics
  const stats = {
    violations: {
      PHI_EXPOSURE: violations.filter(v => v.type === 'PHI_EXPOSURE').length,
      POTENTIAL_HIPAA: violations.filter(v => v.type === 'POTENTIAL_HIPAA').length,
      UNAUTHORIZED_SHARING: violations.filter(v => v.type === 'UNAUTHORIZED_SHARING').length,
      POTENTIAL_MALPRACTICE: violations.filter(v => v.type === 'POTENTIAL_MALPRACTICE').length,
      SUSPICIOUS_BILLING: violations.filter(v => v.type === 'SUSPICIOUS_BILLING').length,
    },
    // Add LLM stats
    llmViolations: violations.filter(v => v.source === 'llm').length,
    regexViolations: violations.filter(v => v.source === 'regex').length,
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Security Monitoring Dashboard</h1>
        
        <div className="flex flex-nowrap gap-4 overflow-x-auto pb-4 -mx-2 px-2">
          <StatCard
            title="Total Messages"
            value={messages.length}
            bgColor="bg-indigo-50"
            textColor="text-indigo-700"
            valueColor="text-indigo-900"
          />
          <StatCard
            title="PHI Exposure"
            value={stats.violations.PHI_EXPOSURE}
            bgColor="bg-red-50"
            textColor="text-red-700"
            valueColor="text-red-900"
            icon="🔒"
          />
          <StatCard
            title="HIPAA"
            value={stats.violations.POTENTIAL_HIPAA}
            bgColor="bg-yellow-50"
            textColor="text-yellow-700"
            valueColor="text-yellow-900"
            icon="📋"
          />
          <StatCard
            title="Unauthorized"
            value={stats.violations.UNAUTHORIZED_SHARING}
            bgColor="bg-orange-50"
            textColor="text-orange-700"
            valueColor="text-orange-900"
            icon="🚫"
          />
          <StatCard
            title="Malpractice"
            value={stats.violations.POTENTIAL_MALPRACTICE}
            bgColor="bg-purple-50"
            textColor="text-purple-700"
            valueColor="text-purple-900"
            icon="⚕️"
          />
          <StatCard
            title="Billing"
            value={stats.violations.SUSPICIOUS_BILLING}
            bgColor="bg-green-50"
            textColor="text-green-700"
            valueColor="text-green-900"
            icon="💰"
          />
          <StatCard
            title="LLM Violations"
            value={stats.llmViolations}
            bgColor="bg-blue-50"
            textColor="text-blue-700"
            valueColor="text-blue-900"
            icon="🤖"
          />
          <StatCard
            title="Total Violations"
            value={violations.length}
            bgColor="bg-gray-50"
            textColor="text-gray-700"
            valueColor="text-gray-900"
            icon="⚠️"
          />
        </div>
      </div>

      <Messages />
    </div>
  );
}

// Update StatCard component to have a fixed width
function StatCard({ title, value, bgColor, textColor, valueColor, icon }) {
  return (
    <div className={`${bgColor} rounded-lg p-4 transition-transform hover:scale-105 duration-200 flex-none w-64`}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-xl">{icon}</span>}
        <h3 className={`text-sm font-semibold ${textColor} truncate`}>{title}</h3>
      </div>
      <p className={`text-2xl font-bold ${valueColor} mt-2`}>{value}</p>
    </div>
  );
}

export default Dashboard;