import { useStore } from "@tanstack/react-store";
import { settingsStore } from "./Messages";

function Settings() {
  const settings = useStore(settingsStore);

  const handleFrequencyChange = (e) => {
    const value = parseInt(e.target.value);
    settingsStore.setState(prev => ({
      ...prev,
      updateFrequency: value
    }));
  };

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-bold">System Settings</h1>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Message Update Frequency (milliseconds)
        </label>
        <select
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          value={settings.updateFrequency}
          onChange={handleFrequencyChange}
        >
          <option value={500}>0.5 seconds</option>
          <option value={1000}>1 second</option>
          <option value={2000}>2 seconds</option>
          <option value={3000}>3 seconds</option>
          <option value={5000}>5 seconds</option>
        </select>
      </div>
    </div>
  );
}

export default Settings;