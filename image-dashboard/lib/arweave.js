const IRYS_GRAPHQL = process.env.NEXT_PUBLIC_IRYS_GRAPHQL || "https://devnet.irys.xyz/graphql";
const IRYS_GATEWAY = process.env.NEXT_PUBLIC_IRYS_GATEWAY || "https://devnet.irys.xyz";

export async function fetchImages() {
  const query = `{
    transactions(
      tags: [
        { name: "App-Name", values: ["azimuth"] },
        { name: "Data-Type", values: ["merged-image"] }
      ],
      order: DESC,
      first: 100
    ) {
      edges {
        node {
          id
          tags { name value }
        }
      }
    }
  }`;

  try {
    const res = await fetch(IRYS_GRAPHQL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const edges = data?.data?.transactions?.edges || [];

    return edges.map(({ node }) => {
      const tags = Object.fromEntries(node.tags.map(t => [t.name, t.value]));
      const recovered = tags.recovered ? Number(tags.recovered) : null;
      const total = tags.total ? Number(tags.total) : null;
      const timestamp = tags.timestamp ? new Date(Number(tags.timestamp) * 1000) : new Date();
      const stations = tags.stations ? tags.stations.split(",") : [];
      return {
        arweaveTxId: node.id,
        imageUrl: `${IRYS_GATEWAY}/${node.id}`,
        passId: tags.passId || null,
        recovered,
        total,
        completeness: recovered && total ? Math.round((recovered / total) * 100) : null,
        stations,
        timestamp,
      };
    });
  } catch {
    return [];
  }
}
