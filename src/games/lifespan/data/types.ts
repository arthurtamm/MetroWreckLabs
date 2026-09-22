export interface GeoPoint {
  date: string   // ISO YYYY-MM-DD
  place: string  // human-readable, e.g. "Salzburg, Austria"
  lat: number
  lng: number
}

export interface PersonHints {
  century: string      // e.g. "18th century"
  gender: string       // e.g. "Male"
  nationality: string  // e.g. "Austrian"
  profession: string   // e.g. "Composer"
}

export interface Person {
  id: string
  name: string
  birth: GeoPoint
  death: GeoPoint
  hints: PersonHints
  bio: string
  acceptedAnswers: string[]  // lowercase accepted strings
}
