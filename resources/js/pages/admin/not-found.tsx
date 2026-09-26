import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { button } from '@/components/admin/button';
import { EmptyState } from '@/components/admin/empty-state';
import { useAdminSection } from '@/components/admin/nav';
import { PageHeader } from '@/components/admin/page-header';
import { Panel } from '@/components/admin/panel';
import { dashboard } from '@/routes/admin';
import { index as activity } from '@/routes/admin/activity';

type NotFoundProps = {
    /** The admin path that matched nothing, e.g. "/admin/looks/42/edit". */
    path: string;
};

/**
 * An admin address with nothing behind it (a mistyped link, or a record
 * someone deleted), inside the admin shell so the sidebar stays at hand.
 * Only admins see it: guests are sent to sign in, and other accounts get
 * the staff-only page first.
 */
export default function NotFound({ path }: NotFoundProps) {
    // Under a module (/admin/looks/42/edit) the trail names it; elsewhere
    // the panel itself.
    const section = useAdminSection();

    return (
        <>
            <Head title="Not found · Admin" />
            <PageHeader
                kicker={section ? undefined : 'Admin panel'}
                crumbs={[{ label: 'Not found' }]}
                title={
                    <>
                        Nothing at this <em>address.</em>
                    </>
                }
                description="The link may be mistyped, or what it pointed to has been deleted."
            />

            <div className="mt-8">
                <Panel>
                    <EmptyState
                        title={
                            <>
                                Not <em>on file.</em>
                            </>
                        }
                        description={
                            <>
                                <span className="break-all text-mist">
                                    {path}
                                </span>{' '}
                                matches no page or record. Deleted leads stay in
                                the Leads list under Deleted, and the activity
                                log shows who deleted what, and when.
                            </>
                        }
                        action={
                            <div className="flex flex-wrap justify-center gap-2">
                                <Link href={dashboard()} className={button()}>
                                    <ArrowLeft aria-hidden />
                                    Back to the dashboard
                                </Link>
                                <Link
                                    href={activity()}
                                    className={button({ variant: 'glass' })}
                                >
                                    Open the activity log
                                </Link>
                            </div>
                        }
                    />
                </Panel>
            </div>
        </>
    );
}
