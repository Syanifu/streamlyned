"use client";

import React from "react";
import { tokenizeLine } from "@/lib/bionic";

interface BionicTextProps {
  text: string;
  className?: string;
}

/**
 * Renders plain text with bionic reading formatting applied.
 * Paragraphs are separated by blank lines; line breaks are preserved.
 */
export default function BionicText({ text, className }: BionicTextProps) {
  const paragraphs = text.split(/\n\n+/);

  return (
    <div className={className}>
      {paragraphs.map((para, pi) => {
        const lines = para.split("\n");
        return (
          <p key={pi} className="mb-4 last:mb-0 leading-relaxed">
            {lines.map((line, li) => (
              <React.Fragment key={li}>
                {li > 0 && <br />}
                {tokenizeLine(line).map((tok, ti) => (
                  <React.Fragment key={ti}>
                    <strong className="font-bold">{tok.bold}</strong>
                    {tok.rest}
                    {tok.space}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
