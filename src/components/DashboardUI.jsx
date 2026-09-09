// React component using Tailwind CSS to display GitHub repo metrics, commit velocity, and open pull requests
import React, { useEffect, useState } from 'react';
import { fetchRepositoryMetrics } from '../api/githubConnector';

const DashboardUI = ({ owner, repo }) => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const getMetrics = async () => {
            try {
                const data = await fetchRepositoryMetrics(owner, repo);
                setMetrics(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        getMetrics();
    }, [owner, repo]);

    if (loading) return <div className="text-center">Loading...</div>;
    if (error) return <div className="text-center text-red-500">{error}</div>;

    return (
        <div className="p-4 bg-gray-100 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">GitHub Repository Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-lg shadow">
                    <h3 className="text-lg font-semibold">Commits</h3>
                    <p>{metrics.commits}</p>
                </div>
                <div className="p-4 bg-white rounded-lg shadow">
                    <h3 className="text-lg font-semibold">Open Issues</h3>
                    <p>{metrics.issues}</p>
                </div>
                <div className="p-4 bg-white rounded-lg shadow">
                    <h3 className="text-lg font-semibold">Pull Requests</h3>
                    <p>{metrics.pullRequests}</p>
                </div>
            </div>
        </div>
    );
};

export default DashboardUI; 