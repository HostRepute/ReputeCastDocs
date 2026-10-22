          <div className="flex flex-wrap items-start gap-5">
            {q.data && q.data.items.length === 0 ? (
              <div className="min-w-0 flex-[1_1_100%]">
                <DashedEmpty
                  title="No webhooks"
                  action={
                    <Button onClick={() => setEditing('new')} disabledReason={q.data ? undefined : 'Loading…'}>
                      Add endpoint
                    </Button>
                  }
                >
