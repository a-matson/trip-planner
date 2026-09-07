import { useEffect, useState } from "react";
import FlexSearch, { type Index } from "flexsearch";

const INDEX_KEY = "city_index_v1";

export function useCityIndex(locations: { n: string; c: string[] }[]) {
  const [index, setIndex] = useState<Index>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

		async function createIndex() {
			const index = new FlexSearch.Index({
				preset: "performance",
				tokenize: "full",
				encoder: "LatinAdvanced",
				resolution: 9,
				cache: true,
			});

			const cached = localStorage.getItem(INDEX_KEY);

			if (cached) {
				console.log("Importing index from cache")
				index.import(INDEX_KEY, cached);
			} else {
				locations.forEach(({c: cities, n: country}) =>
					cities.forEach(city => {
						index.add(`${country}:${city}`, city)
					})
				);

				index.export((key, data) => {
					console.log(key, data)
					localStorage.setItem(key, data);
				})
			}

			if (!cancelled) {
				setIndex(index);
				setReady(true);
			}
		}

		createIndex();

		return () => { cancelled = true };
  }, [locations]);

  return { index, ready };
}