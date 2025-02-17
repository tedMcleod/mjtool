// generates error message for a submission
import { humanReadableDate } from "../../util/date";
import { api_credentials, downloadURL } from "../../util/proxy";
import { student, submission } from "./tasks";

function correctStart(student : student) : string {
    return "P" + student.ref.period + "_" + student.ref.last + "_" + student.ref.first + "_"
}

function daysLate(assignment: submission | null, target: Date) : number | null {
    const millisInDay = 24 * 60 * 60 * 1000

    return assignment != null ? Math.ceil((assignment.ref.timestamp.getTime() - target.getTime()) / millisInDay) : null
}

export function lint(student: student, oldest: submission | null, newest: submission | null, dueDate: Date) : string {
    var ret = ""

    if (!oldest) {
        return "MISSING: as of " + (new Date().toLocaleDateString()) + ". "
    } 

    if (oldest.ref.timestamp > dueDate) {
        const late = daysLate(oldest, dueDate)
        const lateString = late == 1 ? "1 day" : late + " days"
        ret += "LATE: earliest submission was turned in " + lateString + " past the due date of " + dueDate.toLocaleDateString() + ". "
    }

    if (!newest.ref.is_working) {
        ret += "RE NEEDED: latest submission was marked as incomplete by the submitter. "
    }


    const start = correctStart(student)
    if (newest !== null) {
        for (const fileName of Object.keys(newest.map)) {
            if (!fileName.startsWith(start)) {
                ret += "NAMING: file '" + fileName + "' does not start with '" + start + "'. "
            }
        }
    }
    return ret
}

export function spreadsheetHeader() : string {
    const array : string[] = [
        "Oldest Date",
        "Newest Date",
        "First Name",
        "Last Name",
        "Period", 
        "Email",
        "Student ID",
        "Oldest Comments",
        "Newest Comments",
        "Oldest URLs",
        "Newest URLs",
        "Score",
        "Days Late",
        "Comments"
    ]

    return array.join('\t') 
}

export default async function spreadsheetLine(credentials : api_credentials, student : student, dueDate : Date) : Promise<string> {
    const oldest : submission | null = student.submissions.length > 0 ? student.submissions[student.submissions.length - 1] : null
    const newest : submission | null = student.submissions.length > 0 ? student.submissions[0] : null

    const oldestFilenames = oldest ? Object.keys(oldest.map) : []
    const newestFilenames = newest ? Object.keys(newest.map) : []

    const ref = student.ref

    const daysAfter = oldest ? daysLate(oldest, dueDate) : 0

    const array : string[] = [
        humanReadableDate(oldest?.ref.timestamp),
        humanReadableDate(newest?.ref.timestamp),
        ref.first,
        ref.last,
        "" + ref.period,
        ref.email,
        "" + ref.id,
        "\"" + (oldest?.ref.comment || "").replace(/"/g, "\"\"") + "\"",
        "\"" + (newest?.ref.comment || "").replace(/"/g, "\"\"") + "\"",
        "\"" + oldestFilenames.map(x => downloadURL(credentials, oldest, x)).join('\n') + "\"",
        "\"" + newestFilenames.map(x => downloadURL(credentials, newest, x)).join('\n') + "\"",
        oldest != null ? 'sub' : 'missing',
        "" + (daysAfter > 0 ? daysAfter : ""),
        lint(student, oldest, newest, dueDate),
    ]

    return array.join('\t')
}
