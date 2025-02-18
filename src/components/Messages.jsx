import { useState, useEffect } from "react";
import { Store } from "@tanstack/store";
import { useStore } from "@tanstack/react-store";

// Create stores for messages and violations
const messagesStore = new Store([]);
const violationsStore = new Store([]);
const settingsStore = new Store({
  updateFrequency: 5000 // default 5 seconds
});

// Sample violation-triggering messages
const sampleMessages = [
    // Violation messages
    { content: "Patient SSN is 123-45-6789, please update records", type: "PHI" },
    { content: "Here's the diagnosis: Patient has severe hypertension", type: "HIPAA" },
    { content: "Sharing patient John Doe's full medical history with external research team", type: "UNAUTHORIZED_SHARING" },
    { content: "Let's prescribe opioids without proper evaluation to speed things up", type: "MALPRACTICE" },
    { content: "Bill procedure code 99215 instead of 99213 to increase revenue", type: "SUSPICIOUS_BILLING" },
    
    // New subtle violation messages that are hard to detect with keywords
    { content: "Can you look into the case I mentioned earlier? The one about the CEO's wife.", type: "PHI" }, // Contextual PHI violation
    { content: "Just slide that documentation from yesterday under the rug - you know what I mean 😉", type: "MALPRACTICE" }, // Implied misconduct
    { content: "Let's make sure this wealthy donor gets the VIP treatment - move them up the list", type: "MALPRACTICE" }, // Subtle preferential treatment
    { content: "I'll take care of the paperwork later, just like we discussed in the break room", type: "SUSPICIOUS_BILLING" }, // Implied billing fraud
    { content: "FYI - that researcher from Big Pharma Co is still waiting for those files we talked about", type: "UNAUTHORIZED_SHARING" }, // Subtle data sharing
    
    // Non-violation messages
    { content: "Team meeting scheduled for 3 PM in Conference Room A", type: "NORMAL" },
    { content: "The new EMR system training will be next Tuesday", type: "NORMAL" },
    { content: "Please remember to complete your compliance training by end of month", type: "NORMAL" },
    { content: "Maintenance will be updating the computers tonight after hours", type: "NORMAL" },
    { content: "Don't forget to sign up for the healthcare conference next month", type: "NORMAL" }
  ];

// Add new function to call Ollama API
const classifyMessageWithLLM = async (message) => {
  try {
    const OLLAMA_URL = 'http://localhost:11434';
    
    // Define the violation schema
    const schema = {
      type: "object",
      properties: {
        violations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["PHI", "HIPAA", "UNAUTHORIZED_SHARING", "MALPRACTICE", "SUSPICIOUS_BILLING", "UNKNOWN"]
              },
              severity: {
                type: "string",
                enum: ["low", "medium", "high", "critical"]
              },
              description: {
                type: "string"
              }
            },
            required: ["type", "severity", "description"]
          }
        }
      },
      required: ["violations"]
    };

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral-small:24b',
        prompt: `Analyze this healthcare-related message for potential violations of PHI, HIPAA, unauthorized sharing, malpractice, or suspicious billing. The message is: "${message.content}"`,
        format: schema,
        stream: false
      })
    }).catch(error => {
      throw new Error(`LLM service unavailable: ${error.message}`);
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`LLM service error: ${errorText}`);
    }

    const data = await response.json();
    console.log('LLM response:', data);
    let result = data.response;
    result = JSON.parse(result);
    console.log('LLM result:', result);

    // Map violations to our internal format
    return (result.violations || []).map(v => ({
      id: Date.now() + Math.random(),
      messageId: message.id,
      type: v.type,
      severity: v.severity,
      description: v.description
    }));

  } catch (error) {
    console.error('LLM classification error:', error.message);
    if (process.env.NODE_ENV === 'production') {
      // TODO: Add proper error monitoring
      // errorMonitoringService.log(error);
    }
    return [];
  }
};

// Update checkViolations to track the source of violations
const checkViolations = async (message) => {
  // Always get regex-based violations
  const regexViolations = checkRegexViolations(message).map(v => ({
    ...v,
    source: 'regex'
  }));
  
  try {
    // Get LLM-based violations
    const llmViolations = (await classifyMessageWithLLM(message)).map(v => ({
      ...v,
      source: 'llm'
    }));

    console.log('LLM violations:', llmViolations);
    // Combine violations, keeping track of their sources
    return [...regexViolations, ...llmViolations];
  } catch (error) {
    console.error('Failed to get LLM violations, falling back to regex only:', error);
    return regexViolations;
  }
};

// Rename original checkViolations to checkRegexViolations
const checkRegexViolations = (message) => {
  const violations = [];
  
  // Check for PHI (SSN, phone numbers, patient IDs)
  const phiPatterns = /\b(\d{3}-\d{2}-\d{4}|\d{9}|\(\d{3}\)\s?\d{3}-\d{4})\b/;
  if (phiPatterns.test(message.content)) {
    violations.push({ 
      id: Date.now(),
      messageId: message.id,
      type: 'PHI_EXPOSURE',
      severity: 'high',
      description: 'Contains sensitive personal identifiers'
    });
  }

  // Check for HIPAA keywords
  const hipaaKeywords = /\b(diagnosis|treatment|prescription|medical history|condition)\b/i;
  if (hipaaKeywords.test(message.content)) {
    violations.push({ 
      id: Date.now() + 1,
      messageId: message.id,
      type: 'POTENTIAL_HIPAA',
      severity: 'medium',
      description: 'Contains protected health information'
    });
  }

  // Check for unauthorized sharing
  const sharingKeywords = /\b(share|send|forward|external|outside)\b.*\b(records?|history|data|information)\b/i;
  if (sharingKeywords.test(message.content)) {
    violations.push({ 
      id: Date.now() + 2,
      messageId: message.id,
      type: 'UNAUTHORIZED_SHARING',
      severity: 'high',
      description: 'Potential unauthorized data sharing'
    });
  }

  // Check for malpractice indicators
  const malpracticeKeywords = /\b(without|skip|avoid|bypass)\b.*\b(evaluation|assessment|procedure|protocol)\b/i;
  if (malpracticeKeywords.test(message.content)) {
    violations.push({ 
      id: Date.now() + 3,
      messageId: message.id,
      type: 'POTENTIAL_MALPRACTICE',
      severity: 'critical',
      description: 'Possible unethical medical practice'
    });
  }

  // Check for suspicious billing
  const billingKeywords = /\b(bill|charge|code|revenue)\b.*\b(increase|higher|upgrade|change)\b/i;
  if (billingKeywords.test(message.content)) {
    violations.push({ 
      id: Date.now() + 4,
      messageId: message.id,
      type: 'SUSPICIOUS_BILLING',
      severity: 'high',
      description: 'Potential billing fraud'
    });
  }

  return violations;
};

// Add queue management outside of the component
const requestQueue = [];

// Create a store for pending analysis messages
const pendingAnalysisStore = new Store(new Set());

const processQueue = async () => {
  if (requestQueue.length === 0) return;
  
  const message = requestQueue.shift();
  
  try {
    const violations = await checkViolations(message);
    if (violations.length > 0) {
      violationsStore.setState(prev => [...prev, ...violations]);
    }
    
    // Remove message from pending set
    pendingAnalysisStore.setState(prev => {
      const newSet = new Set(prev);
      newSet.delete(message.id);
      return newSet;
    });
  } catch (error) {
    console.error('Error processing message:', error);
    // Still remove from pending even on error
    pendingAnalysisStore.setState(prev => {
      const newSet = new Set(prev);
      newSet.delete(message.id);
      return newSet;
    });
  }
};

function Messages() {
  const messages = useStore(messagesStore);
  const violations = useStore(violationsStore);
  const settings = useStore(settingsStore);
  const [filter, setFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const pendingAnalysis = useStore(pendingAnalysisStore);

  // Separate effect for message generation
  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      messagesStore.setState(() => [{
        id: 1,
        content: "System initialized for message monitoring",
        timestamp: new Date(),
        sender: "System",
      }]);
      setIsLoading(false);
    }, 1000);

    const interval = setInterval(() => {
      const randomMessage = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
      const newMessage = {
        id: Date.now(),
        content: randomMessage.content,
        timestamp: new Date(),
        sender: `User${Math.floor(Math.random() * 10)}`,
      };

      messagesStore.setState(prev => [...prev, newMessage]);
      
      // Add message ID to pending set and queue
      pendingAnalysisStore.setState(prev => new Set([...prev, newMessage.id]));
      requestQueue.push(newMessage);
    }, settings.updateFrequency);

    return () => clearInterval(interval);
  }, [settings.updateFrequency]);

  // Separate effect for queue processing
  useEffect(() => {
    const processingInterval = setInterval(() => {
      processQueue();
    }, 10000);

    return () => clearInterval(processingInterval);
  }, []);

  const filteredMessages = messages.filter(msg => {
    const contentMatch = msg.content.toLowerCase().includes(filter.toLowerCase());
    if (!contentMatch) return false;
    
    if (severityFilter === 'all') return true;
    
    // Only show messages with violations matching the exact severity level
    return violations.some(v => 
      v.messageId === msg.id && v.severity === severityFilter
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 mb-4">
            <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <span className="text-gray-600">Loading messages...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Message Monitor</h1>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <select
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input
            type="text"
            placeholder="Search messages..."
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 w-full sm:w-64"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg divide-y divide-gray-100">
        {filteredMessages.map(message => {
          const messageViolations = violations.filter(v => v.messageId === message.id);
          const hasRegexViolation = messageViolations.some(v => v.source === 'regex');
          const hasLLMOnlyViolation = messageViolations.some(v => v.source === 'llm') && 
                                    !messageViolations.some(v => v.source === 'regex');
          const isAnalyzing = pendingAnalysis.has(message.id);

          return (
            <div 
              key={message.id}
              className={`p-4 transition-colors duration-200 ${
                isAnalyzing 
                  ? 'bg-gray-50'
                  : hasRegexViolation 
                    ? 'bg-red-50'
                    : hasLLMOnlyViolation
                      ? 'bg-amber-50'
                      : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{message.sender}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {isAnalyzing && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    Analyzing...
                  </span>
                )}
              </div>
              <p className="mt-2 text-gray-700">{message.content}</p>
              
              {messageViolations.length > 0 && (
                <div className="mt-3 space-y-2">
                  {messageViolations.map(violation => (
                    <div 
                      key={violation.id}
                      className={`rounded-md p-2 ${
                        violation.source === 'regex' 
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{violation.source === 'llm' ? '🤖' : '⚠️'}</span>
                        <span className="font-medium">{violation.type}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white bg-opacity-50">
                          {violation.severity}
                        </span>
                      </div>
                      <p className="mt-1 text-sm ml-6">{violation.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Messages;
export { violationsStore, settingsStore, messagesStore };