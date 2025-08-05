import { GetServerSideProps } from 'next';
import dbConnect from '@/lib/mongodb';
import Proposal from '@/models/Proposal';
import Head from 'next/head';

interface ProposalPageProps {
  proposal: {
    name: string;
    html: string;
  };
}

const ProposalPage = ({ proposal }: ProposalPageProps) => {
  if (!proposal) {
    return <div>Proposal not found</div>;
  }

  return (
    <>
      <Head>
        <title>{proposal.name}</title>
      </Head>
      <div dangerouslySetInnerHTML={{ __html: proposal.html }} />
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { shareableLink } = context.params as { shareableLink: string };
  const { req } = context;
  const host = req.headers.host;

  await dbConnect();

  const proposal = await Proposal.findOne({ shareableLink });

  if (!proposal) {
    return {
      notFound: true,
    };
  }

  // Track view
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString();
  
  let location = 'unknown';
  try {
    const locationResponse = await fetch(`https://ipapi.co/${ip}/json/`);
    if(locationResponse.ok) {
      const locationData = await locationResponse.json();
      location = `${locationData.city}, ${locationData.region}, ${locationData.country_name}`;
    }
  } catch (error) {
    console.error("Could not fetch location", error);
  }

  proposal.views += 1;
  proposal.viewDetails.push({
    ip,
    location,
    timestamp: new Date(),
  });
  await proposal.save();

  const updatedHtml = proposal.html.replace(/localhost:3000/g, host);

  return {
    props: {
      proposal: {
        name: proposal.name,
        html: updatedHtml,
      },
    },
  };
};

export default ProposalPage;
