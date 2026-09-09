import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRepositoryMetrics } from '../api/githubConnector.js';

describe('fetchRepositoryMetrics', () => {
    beforeEach(() => {
        vi.useRealTimers();
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it.each([
        [undefined, 'repository'],
        ['owner', undefined],
        ['', 'repository'],
        ['owner', '']
    ])('rejects when owner or repository is missing: %j', async (owner, repo) => {
        await expect(fetchRepositoryMetrics(owner, repo)).rejects.toThrow(
            'GitHub owner and repository name are required.'
        );
        expect(fetch).not.toHaveBeenCalled();
    });

    it('fetches the repository and maps the GitHub response', async () => {
        fetch.mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                commits_url: 'https://api.github.com/repos/acme/project/commits{/sha}',
                open_issues_count: 7,
                pull_requests_url: 'https://api.github.com/repos/acme/project/pulls{/number}'
            })
        });

        await expect(fetchRepositoryMetrics('acme', 'project')).resolves.toEqual({
            commits: 'https://api.github.com/repos/acme/project/commits{/sha}',
            issues: 7,
            pullRequests: 'https://api.github.com/repos/acme/project/pulls{/number}'
        });

        expect(fetch).toHaveBeenCalledWith(
            'https://api.github.com/repos/acme/project',
            expect.objectContaining({
                method: 'GET',
                headers: {
                    Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'User-Agent': 'ai-pm-dashboard'
                },
                signal: expect.any(AbortSignal)
            })
        );
    });

    it('URL-encodes owner and repository names', async () => {
        fetch.mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({})
        });

        await fetchRepositoryMetrics('team/name', 'repo name');

        expect(fetch).toHaveBeenCalledWith(
            'https://api.github.com/repos/team%2Fname/repo%20name',
            expect.any(Object)
        );
    });

    it('wraps an API error using the response body', async () => {
        fetch.mockResolvedValue({
            ok: false,
            status: 404,
            statusText: 'Not Found',
            text: vi.fn().mockResolvedValue('Repository not found')
        });

        await expect(fetchRepositoryMetrics('acme', 'missing')).rejects.toThrow(
            'Unable to fetch repository metrics: GitHub API request failed (404): Repository not found'
        );
    });

    it('uses status text when an API error has no response body', async () => {
        fetch.mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            text: vi.fn().mockResolvedValue('')
        });

        await expect(fetchRepositoryMetrics('acme', 'project')).rejects.toThrow(
            'Unable to fetch repository metrics: GitHub API request failed (500): Internal Server Error'
        );
    });

    it('wraps network failures', async () => {
        fetch.mockRejectedValue(new Error('connection refused'));

        await expect(fetchRepositoryMetrics('acme', 'project')).rejects.toThrow(
            'Unable to fetch repository metrics: connection refused'
        );
    });

    it('translates an aborted request into a timeout error', async () => {
        vi.useFakeTimers();
        fetch.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => {
                const error = new Error('aborted');
                error.name = 'AbortError';
                reject(error);
            });
        }));

        const timeoutAssertion = expect(
            fetchRepositoryMetrics('acme', 'project')
        ).rejects.toThrow('GitHub API request timed out.');
        await vi.advanceTimersByTimeAsync(10000);

        await timeoutAssertion;
    });

    it('clears the timeout after a successful request', async () => {
        vi.useFakeTimers();
        const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
        fetch.mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                commits_url: 'commits',
                open_issues_count: 1,
                pull_requests_url: 'pulls'
            })
        });

        await fetchRepositoryMetrics('acme', 'project');
        await vi.advanceTimersByTimeAsync(10000);

        expect(abortSpy).not.toHaveBeenCalled();
    });
});