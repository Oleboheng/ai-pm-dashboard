// Function to fetch GitHub repository metrics (commits, issues, PR counts) using the GitHub REST API.
export const fetchRepositoryMetrics = async (owner, repo) => {
    if (!owner || !repo) {
        throw new Error('GitHub owner and repository name are required.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(
            `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
            {
                method: 'GET',
                headers: {
                    Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'User-Agent': 'ai-pm-dashboard'
                },
                signal: controller.signal
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `GitHub API request failed (${response.status}): ${errorText || response.statusText}`
            );
        }

        const data = await response.json();

        return {
            commits: data.commits_url,
            issues: data.open_issues_count,
            pullRequests: data.pull_requests_url
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('GitHub API request timed out.');
        }

        throw new Error(`Unable to fetch repository metrics: ${error.message}`);
    } finally {
        clearTimeout(timeoutId);
    }
};  