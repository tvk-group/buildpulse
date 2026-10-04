import { ArtsSubnav } from "@/components/buildpulse/ArtsSubnav";
import { ArtsSubmissionPortal } from "@/components/buildpulse/ArtsSubmissionPortal";

export const metadata={title:"Submit Creative Work | BuildPulse",description:"Submit original art, music, design and creative work for BuildPulse editorial review.",alternates:{canonical:"/arts/contribute"}};

export default function Page() {
  return (
    <main>
      <ArtsSubnav />
      <section className="mx-auto max-w-[1100px] px-5 py-12">
        <p className="text-xs font-black uppercase tracking-widest text-[#8a4b3a]">
          Creator Panel
        </p>
        <h1 className="mt-3 text-5xl font-black">Submit art, music or creative work</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-[#53606b]">
          Creators can submit original work for BuildPulse editorial review and the Artist Showcase.
          Submission never guarantees publication.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl border border-black/10 bg-white p-7">
            <h2 className="text-2xl font-black">Accepted disciplines</h2>
            <p className="mt-4 text-sm leading-7 text-[#53606b]">
              Painting, photography, sculpture, illustration, digital art, music, architecture,
              design, film, performance and multidisciplinary work.
            </p>
          </section>

          <section className="rounded-2xl bg-[#efe6df] p-7">
            <h2 className="text-2xl font-black">Rights & disclosure</h2>
            <p className="mt-4 text-sm leading-7 text-[#53606b]">
              You must own or control publication rights, identify third-party material, disclose
              AI assistance and commercial relationships, and confirm appropriate releases where
              identifiable people appear. BuildPulse may request evidence before publication.
            </p>
          </section>
        </div>

        <section className="mt-8 rounded-2xl border border-black/10 p-7">
          <h2 className="text-2xl font-black">Review process</h2>
          <p className="mt-3 text-sm leading-7 text-[#53606b]">
            BuildPulse automated pre-checks may flag text, metadata, rights inconsistencies, deceptive promotion
            and other review risks. Human editorial review remains mandatory. Accepted work is
            labeled with its creator and publication context; paid promotion is separately labeled.
          </p>
        </section>
        <div className="mt-8"><ArtsSubmissionPortal/></div>
      </section>
    </main>
  );
}
