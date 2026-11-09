# Production SSH failure investigation — 2026-11-09

## Confirmed evidence

- Production run 181 (`42636542410`, commit `23f8f9c`) passed tests, TypeScript and the full Next.js build. Deploy failed with `dial tcp ***:22: i/o timeout`, before any remote command executed.
- Runs 178 and 179 have the same connection failure. Run 177 (`42379628599`) completed the same deployment commands and application health check successfully. The failure is before SSH authentication, not a rejected key, npm, PM2 or VPS build memory error.
- Diagnostic run `42637803229` tested Ubuntu 24.04 and macOS 15 Intel independently. Both timed out on all three attempts. Changing the runner OS alone does not resolve this incident.
- The exact device dropping the connection is still unconfirmed. A TCP timeout cannot distinguish a wrong origin address, host firewall/sshguard, provider firewall or an upstream network path. Previous UFW allow rules alone do not prove nftables/sshguard and provider routing permit this traffic.

## Workflow changes

Production still runs only on pushes to `main`, waits for full validation, pins the validated SHA, and restarts PM2 only after a successful build. A read-only SSH-banner probe now retries the connection three times before deployment and reports network failures separately from authentication/build errors. The remote deployment itself is never retried automatically, avoiding duplicate builds or restarts after a partial failure. The SSH handshake timeout is explicitly 90 seconds; this only tolerates temporary delays and cannot fix persistent packet drops.

`SERVER_PORT` is optional and defaults to 22 in both the probe and SSH action. Set it only after the server actually listens on a different port; changing this secret alone does not change the VPS. The deploy runner is pinned to Ubuntu 24.04 to avoid an unrelated `ubuntu-latest` OS migration. No firewall, SSH keys, database or production process settings are changed by this branch.

`Diagnose production SSH` runs without a deployment or private key. It compares Ubuntu/macOS, records each runner's public IPv4, compares origin ports 80/443 and tests the configured SSH endpoint. Its branch push trigger is limited to changes to its own file on `fix/actions-ssh-deploy`. It can also be run manually after the workflow is present on the default branch. Re-run the diagnostic workflow from its Actions run page while capturing packets on the VPS.

## Required VPS evidence

Run these read-only commands in the working VPS session. Do not disable UFW, nftables or sshguard wholesale:

```bash
sudo ss -lntp 'sport = :22'
sudo ufw status verbose
sudo nft list ruleset
```

Then correlate an Actions diagnostic attempt with a packet capture. Substitute its recorded public IPv4 below. This captures only packet headers and stops after 90 seconds:

```bash
sudo timeout 90 tcpdump -ni any -nn 'host RUNNER_IPV4 and tcp port 22'
```

| Capture result | Next investigation |
| --- | --- |
| No matching SYN reaches the VPS | Verify `SERVER_HOST` against the actual VPS public IP, then provider firewall/routing with the diagnostic UTC time and runner source IP. |
| SYN arrives, no SYN-ACK leaves | Inspect local nftables/sshguard/UFW counters and SSH listener; correct the specific blocking rule only after identifying it. |
| SYN-ACK leaves but no ACK returns | Provider/return-path filtering; give the packet trace and source/destination to the hosting provider. |
| TCP connects but no SSH banner | Inspect sshd connection limits, sshguard and SSH service logs. |
| SSH authentication is reached and rejected | Investigate username/key then; network retries do not repair authentication. |

Success requires the diagnostic to receive an SSH banner, followed by a production run that completes the PM2 restart and local health check. Passing CI or merely changing timeouts is insufficient. If the provider cannot restore inbound connectivity from GitHub, consider a deliberately configured outbound deployment channel as a separate infrastructure change.

References: [GitHub runner networking](https://docs.github.com/en/actions/reference/runners/github-hosted-runners), [SSH action connection versus command timeouts](https://github.com/appleboy/ssh-action/tree/v1.2.3).
