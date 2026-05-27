import Foundation

enum Progress {
    static func year() -> Double {
        let cal = Calendar.current
        let now = Date()
        let y = cal.component(.year, from: now)
        let start = cal.date(from: DateComponents(year: y, month: 1, day: 1))!
        let end   = cal.date(from: DateComponents(year: y + 1, month: 1, day: 1))!
        return clamp(now.timeIntervalSince(start) / end.timeIntervalSince(start))
    }

    static func month() -> Double {
        let cal   = Calendar.current
        let now   = Date()
        let start = cal.date(from: cal.dateComponents([.year, .month], from: now))!
        let end   = cal.date(byAdding: .month, value: 1, to: start)!
        return clamp(now.timeIntervalSince(start) / end.timeIntervalSince(start))
    }

    static func day() -> Double {
        let cal   = Calendar.current
        let now   = Date()
        let start = cal.startOfDay(for: now)
        let end   = cal.date(byAdding: .day, value: 1, to: start)!
        return clamp(now.timeIntervalSince(start) / end.timeIntervalSince(start))
    }

    private static func clamp(_ v: Double) -> Double {
        return max(0, min(1, v))
    }
}
