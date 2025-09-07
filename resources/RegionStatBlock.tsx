import React from 'react';
import classNames from 'classnames';
import CopyOnClick from '@/components/elements/CopyOnClick';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface RegionStatBlockProps {
    title: string;
    copyOnClick?: string;
    color?: string;
    icon_name: string;
    className?: string;
    children: React.ReactNode;
}

export default ({ title, copyOnClick, icon_name, color, className, children }: RegionStatBlockProps) => {
    return (
        <CopyOnClick text={copyOnClick}>
            <div className={classNames('bg-gray-600 rounded-lg p-3 relative', className)}>
                {color && (
                    <div className={classNames('absolute top-0 left-0 w-2 h-full rounded-l-lg', color)} />
                )}
                <div className={'flex items-center'}>
                    <div className={classNames('flex-shrink-0 mr-3', color || 'text-gray-400')}>
                        {icon_name.length === 2 ? (
                            <span className={'text-lg font-bold'}>{icon_name}</span>
                        ) : (
                            <FontAwesomeIcon icon={icon_name as any} className={'text-lg'} />
                        )}
                    </div>
                    <div className={'flex flex-col justify-center overflow-hidden w-full'}>
                        <p className={'text-xs font-semibold text-gray-200'}>{title}</p>
                        <div className={'text-sm font-medium text-gray-50 truncate'}>
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </CopyOnClick>
    );
};