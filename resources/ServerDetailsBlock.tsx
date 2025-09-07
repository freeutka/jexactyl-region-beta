import { faClock, faCloudDownloadAlt, faCloudUploadAlt, faHdd, faMemory, faMicrochip, faWifi } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { SocketEvent, SocketRequest } from '@/components/server/events';
import UptimeDuration from '@/components/server/UptimeDuration';
import StatBlock from '@/components/server/console/StatBlock';
import RegionStatBlock from '@/components/server/console/RegionStatBlock';
import { bytesToString, ip, mbToBytes } from '@/lib/formatters';
import { capitalize } from '@/lib/strings';
import { ServerContext } from '@/state/server';
import useWebsocketEvent from '@/plugins/useWebsocketEvent';
import axios from 'axios';

type Stats = Record<'memory' | 'cpu' | 'disk' | 'uptime' | 'rx' | 'tx', number>;

interface IPData {
    city: string;
    country_name: string;
    country_code: string;
}

function getBackgroundColor(value: number, max: number | null): string | undefined {
    const delta = !max ? 0 : value / max;

    if (delta > 0.8) {
        if (delta > 0.9) {
            return '#ef4444';
        }
        return '#f59e0b';
    }

    return undefined;
}

function Limit({ limit, children }: { limit: string | null; children: ReactNode }) {
    return (
        <>
            {children}
            <span className={'ml-1 select-none text-[70%] text-slate-300'}>/ {limit || <>&infin;</>}</span>
        </>
    );
}

function RegionNameLimit({ limit, children }: { limit: string | null; children: ReactNode }) {
    return (
        <>
            {children}
            <span className={'ml-1 select-none text-[70%] text-slate-300'}>, {limit || <>&infin;</>}</span>
        </>
    );
}

function isLocalIPAddress(ipAddress: string) {
    if (!ipAddress) {
        return false;
    }

    const localIPPatterns = [
        /^127\./,
        /^10\./,
        /^192\.168\./,
        /^172\.(1[6-9]|2\d|3[0-1])\./,
        /^::1$/,
        /^fe80:/,
    ];

    for (const pattern of localIPPatterns) {
        if (pattern.test(ipAddress)) {
            return true;
        }
    }

    return false;
}

function ServerDetailsBlock({ className }: { className?: string }) {
    const [stats, setStats] = useState<Stats>({ memory: 0, cpu: 0, disk: 0, uptime: 0, tx: 0, rx: 0 });
    const [ipInfo, setIpInfo] = useState<IPData | null>(null);

    const status = ServerContext.useStoreState(state => state.status.value);
    const connected = ServerContext.useStoreState(state => state.socket.connected);
    const instance = ServerContext.useStoreState(state => state.socket.instance);
    const limits = ServerContext.useStoreState(state => state.server.data!.limits);

    const textLimits = useMemo(
        () => ({
            cpu: limits?.cpu ? `${limits.cpu}%` : null,
            memory: limits?.memory ? bytesToString(mbToBytes(limits.memory)) : null,
            disk: limits?.disk ? bytesToString(mbToBytes(limits.disk)) : null,
        }),
        [limits],
    );

    const allocation = ServerContext.useStoreState(state => {
        const match = state.server.data!.allocations.find(allocation => allocation.isDefault);
        return !match ? 'n/a' : `${match.alias || ip(match.ip)}:${match.port}`;
    });

    const serverIp = ServerContext.useStoreState(state => {
        const match = state.server.data!.allocations.find(allocation => allocation.isDefault);
        return !match ? null : ip(match.ip);
    });

    useEffect(() => {
        if (serverIp) {
            const fetchIpInfo = async (ip: string): Promise<void> => {
                try {
                    const ipMatcher = /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/;
                    let urlRequest = 'https://api.ipapi.is/';
                    
                    if (isLocalIPAddress(ip)) {
                        try {
                            const response = await axios.get('https://api.ipify.org?format=json');
                            urlRequest += `?q=${response.data.ip}`;
                        } catch (error) {
                            setIpInfo({
                                city: "Unknown",
                                country_name: "Local Network",
                                country_code: "LAN",
                            });
                            return;
                        }
                    } else {
                        if (ipMatcher.test(ip)) {
                            urlRequest += `?q=${ip}`;
                        } else {
                            try {
                                const response = await axios.get(`https://dns.google/resolve?name=${ip}`);
                                if (response.data && response.data.Status === 0 && response.data.Answer) {
                                    const ipAddress = response.data.Answer[0].data;
                                    urlRequest += `?q=${ipAddress}`;
                                } else {
                                    throw new Error('DNS resolution failed');
                                }
                            } catch (error) {
                                setIpInfo({
                                    city: "Unknown",
                                    country_name: "DNS Error",
                                    country_code: "N/A",
                                });
                                return;
                            }
                        }
                    }

                    const response = await axios.get(urlRequest);
                    const jsonData = response.data;

                    if (jsonData && jsonData.location) {
                        setIpInfo({
                            city: jsonData.location.city || "Unknown",
                            country_name: jsonData.location.country || "Unknown",
                            country_code: jsonData.location.country_code || "N/A",
                        });
                    } else {
                        setIpInfo({
                            city: "Unknown",
                            country_name: "API Error",
                            country_code: "N/A",
                        });
                    }
                } catch (error) {
                    setIpInfo({
                        city: "Unknown",
                        country_name: "Fetch Error",
                        country_code: "N/A",
                    });
                }
            };

            fetchIpInfo(serverIp);
        } else {
            setIpInfo(null);
        }
    }, [serverIp]);

    useEffect(() => {
        if (!connected || !instance) {
            return;
        }

        instance.send(SocketRequest.SEND_STATS);
    }, [instance, connected]);

    useWebsocketEvent(SocketEvent.STATS, data => {
        let stats: any = {};
        try {
            stats = JSON.parse(data);
        } catch (e) {
            return;
        }

        setStats({
            memory: stats.memory_bytes,
            cpu: stats.cpu_absolute,
            disk: stats.disk_bytes,
            tx: stats.network?.tx_bytes || 0,
            rx: stats.network?.rx_bytes || 0,
            uptime: stats.uptime || 0,
        });
    });

    return (
        <div className={classNames('grid grid-cols-10 gap-2 md:gap-4 mb-6', className)}>
            <StatBlock icon={faWifi} title={'Address'} className={'col-span-5 lg:col-span-2'} copyOnClick={allocation}>
                {allocation}
            </StatBlock>
            <StatBlock
                icon={faClock}
                title={'Uptime'}
                className={'col-span-5 lg:col-span-2'}
                color={getBackgroundColor(status === 'running' ? 0 : status !== 'offline' ? 9 : 10, 10)}
            >
                {status === null ? (
                    'Offline'
                ) : stats.uptime > 0 ? (
                    <UptimeDuration uptime={stats.uptime / 1000} />
                ) : (
                    capitalize(status)
                )}
            </StatBlock>
            <StatBlock
                icon={faMicrochip}
                title={'CPU Load'}
                className={'col-span-5 lg:col-span-2'}
                color={getBackgroundColor(stats.cpu, limits.cpu)}
            >
                {status === 'offline' ? (
                    <span className={'text-slate-400'}>Offline</span>
                ) : (
                    <Limit limit={textLimits.cpu}>{stats.cpu.toFixed(2)}%</Limit>
                )}
            </StatBlock>
            <StatBlock
                icon={faMemory}
                title={'Memory'}
                className={'col-span-5 lg:col-span-2'}
                color={getBackgroundColor(stats.memory / 1024, limits.memory * 1024)}
            >
                {status === 'offline' ? (
                    <span className={'text-slate-400'}>Offline</span>
                ) : (
                    <Limit limit={textLimits.memory}>{bytesToString(stats.memory)}</Limit>
                )}
            </StatBlock>
            <StatBlock
                icon={faHdd}
                title={'Disk'}
                className={'col-span-5 lg:col-span-2'}
                color={getBackgroundColor(stats.disk / 1024, limits.disk * 1024)}
            >
                <Limit limit={textLimits.disk}>{bytesToString(stats.disk)}</Limit>
            </StatBlock>
            <StatBlock 
                icon={faCloudDownloadAlt} 
                title={'Network (Inbound)'} 
                className={'col-span-5 lg:col-span-2'}
            >
                {status === 'offline' ? <span className={'text-slate-400'}>Offline</span> : bytesToString(stats.rx)}
            </StatBlock>
            <StatBlock 
                icon={faCloudUploadAlt} 
                title={'Network (Outbound)'} 
                className={'col-span-5 lg:col-span-2'}
            >
                {status === 'offline' ? <span className={'text-slate-400'}>Offline</span> : bytesToString(stats.tx)}
            </StatBlock>
            {ipInfo && (
                <RegionStatBlock 
                    icon_name={ipInfo.country_code} 
                    title={'Region'}
                    className={'col-span-5 lg:col-span-2'}
                >
                    <RegionNameLimit limit={ipInfo.city}>{ipInfo.country_name}</RegionNameLimit>
                </RegionStatBlock>
            )}
        </div>
    );
}

export default ServerDetailsBlock;