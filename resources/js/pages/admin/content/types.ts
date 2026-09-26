/*
 * Props of /admin/content (Admin\SiteContentController@edit).
 */

export type SettingType =
    | 'text'
    | 'textarea'
    | 'accent'
    | 'email'
    | 'url'
    | 'phone'
    | 'number';

export type SettingField = {
    /** Dot key, also the input name: "contact.email", "sections.kiosk.title". */
    key: string;
    label: string;
    type: SettingType;
    help: string | null;
    /**
     * Copy, written in English and Arabic: the Arabic input is named
     * "<key>_ar". Addresses, links and figures are the same on both pages.
     */
    translatable: boolean;
    /** What the English page shows while the field is empty (null: nothing). */
    default: string | number | null;
    /** The stored English; null means the default is in use. */
    value: string | number | null;
    /** What the Arabic page shows while the Arabic is empty (null when not translatable). */
    default_ar: string | null;
    /** The stored Arabic; null means the Arabic default is in use. */
    value_ar: string | null;
};

export type SettingGroup = {
    key: string;
    label: string;
    help: string | null;
    /** Fields in the group. */
    total: number;
    /** Fields with a stored value in either language (not the default). */
    customised: number;
};

export type SiteContentProps = {
    /** The open group's key. */
    group: string;
    groups: SettingGroup[];
    /** The open group's fields, in schema order. */
    fields: SettingField[];
    /** The last save of this group (from the activity log). */
    lastSaved: { at: string; user: string | null } | null;
};
